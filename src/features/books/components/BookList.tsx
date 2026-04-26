import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FileOpenOutlinedIcon from '@mui/icons-material/FileOpenOutlined';
import LinkIcon from '@mui/icons-material/Link';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PostAddIcon from '@mui/icons-material/PostAdd';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { useBooksFacade } from '../facade/book.facade';
import type { BooksFacade, OpenPdfTab } from '../facade/book.facade.types';
import type { Book } from '../schema/book.schema';

interface BookListProps {
  onSelectBook: (book: Book) => void;
}

interface BookCardProps {
  book: Book;
  onSelect: () => void;
}

function BookCard({ book, onSelect }: BookCardProps) {
  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 },
      }}
    >
      <CardActionArea
        onClick={onSelect}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardMedia
          component="img"
          height="200"
          image={book.coverUrl || 'https://picsum.photos/seed/local-pdf/300/400'}
          alt={book.title}
          sx={{ objectFit: 'cover' }}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ lineHeight: 1.3 }}>
            {book.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {book.author}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {book.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

interface OpenPdfDialogProps {
  facade: BooksFacade;
}

function OpenPdfDialog({ facade }: OpenPdfDialogProps) {
  const tabValue =
    facade.dialogTab === 'url' ? 0 : facade.dialogTab === 'file' ? 1 : facade.dialogTab === 'config' ? 2 : 3;
  const handleTabChange = (_: unknown, value: number) => {
    facade.setDialogTab(value === 0 ? 'url' : value === 1 ? 'file' : value === 2 ? 'config' : 'json');
  };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    facade.setFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };
  const handleJsonFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    facade.setJsonFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };
  const handleUrlKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && facade.canSubmit) {
      facade.submitUrl();
    }
  };
  const activeTab: OpenPdfTab = facade.dialogTab;
  const handleOpen =
    activeTab === 'url'
      ? facade.submitUrl
      : activeTab === 'file'
        ? facade.submitFile
        : activeTab === 'config'
          ? facade.submitConfig
          : facade.submitJson;
  const actionLabel = activeTab === 'json' ? 'Nhập' : 'Mở';

  return (
    <Dialog open={facade.dialogOpen} onClose={facade.closeDialog} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0 }}>Mở PDF</DialogTitle>
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<LinkIcon fontSize="small" />} iconPosition="start" label="Từ URL" />
        <Tab icon={<UploadFileIcon fontSize="small" />} iconPosition="start" label="Tải lên" />
        <Tab icon={<PostAddIcon fontSize="small" />} iconPosition="start" label="Cấu hình" />
        <Tab icon={<UploadFileIcon fontSize="small" />} iconPosition="start" label="JSON" />
      </Tabs>

      <DialogContent sx={{ pt: 3 }}>
        {facade.dialogError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {facade.dialogError}
          </Alert>
        )}

        {activeTab === 'url' && (
          <TextField
            autoFocus
            fullWidth
            label="URL file PDF"
            placeholder="/books/pm/document.pdf"
            value={facade.url}
            onChange={(event) => facade.setUrl(event.target.value)}
            onKeyDown={handleUrlKeyDown}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: facade.url ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={facade.clearUrl} aria-label="Xoá URL">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        )}

        {activeTab === 'file' && (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: facade.file ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: facade.file ? 'primary.50' : 'background.default',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            <Button component="label" variant="text" sx={{ display: 'flex', flexDirection: 'column', mx: 'auto' }}>
              <input hidden type="file" accept=".pdf,application/pdf" onChange={handleFileChange} />
              <UploadFileIcon
                sx={{ fontSize: 40, color: facade.file ? 'primary.main' : 'action.disabled', mb: 1 }}
              />
              {facade.file ? (
                <>
                  <Typography variant="body1" fontWeight={600} color="primary">
                    {facade.file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(facade.file.size / 1024 / 1024).toFixed(2)} MB - Click để đổi file
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body1" color="text.secondary">
                    Click để chọn file PDF
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    hoặc kéo thả vào đây
                  </Typography>
                </>
              )}
            </Button>
          </Box>
        )}

        {activeTab === 'config' && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              autoFocus
              fullWidth
              required
              label="Tên sách"
              value={facade.config.title}
              onChange={(event) => facade.setConfigField('title', event.target.value)}
            />
            <TextField
              fullWidth
              label="Tác giả"
              value={facade.config.author}
              onChange={(event) => facade.setConfigField('author', event.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Mô tả"
              value={facade.config.description}
              onChange={(event) => facade.setConfigField('description', event.target.value)}
            />
            <TextField
              fullWidth
              label="URL ảnh bìa"
              placeholder="https://example.com/cover.jpg"
              value={facade.config.coverUrl}
              onChange={(event) => facade.setConfigField('coverUrl', event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              required
              label="URL file PDF"
              placeholder="/books/pm/document.pdf"
              value={facade.config.pdfUrl}
              onChange={(event) => facade.setConfigField('pdfUrl', event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && facade.canSubmit && facade.submitConfig()}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        )}

        {activeTab === 'json' && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Alert severity="info">
              Chọn file JSON hoặc dán JSON trực tiếp. Dữ liệu dùng dạng mảng book configs hoặc object có field books.
            </Alert>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: facade.jsonFile ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: facade.jsonFile ? 'primary.50' : 'background.default',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <Button component="label" variant="text" sx={{ display: 'flex', flexDirection: 'column', mx: 'auto' }}>
                <input hidden type="file" accept=".json,application/json" onChange={handleJsonFileChange} />
                <UploadFileIcon
                  sx={{ fontSize: 40, color: facade.jsonFile ? 'primary.main' : 'action.disabled', mb: 1 }}
                />
                {facade.jsonFile ? (
                  <>
                    <Typography variant="body1" fontWeight={600} color="primary">
                      {facade.jsonFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(facade.jsonFile.size / 1024).toFixed(1)} KB - Click để đổi file
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body1" color="text.secondary">
                      Click để chọn file JSON
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Import nhiều book vào thư viện
                    </Typography>
                  </>
                )}
              </Button>
            </Box>
            <TextField
              fullWidth
              multiline
              minRows={8}
              label="Dán JSON trực tiếp"
              placeholder={`[
  {
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "description": "",
    "coverUrl": "",
    "pdfUrl": "/books/pm/clean-code.pdf"
  }
]`}
              value={facade.jsonText}
              onChange={(event) => facade.setJsonText(event.target.value)}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={facade.closeDialog} color="inherit">
          Huỷ
        </Button>
        <Button
          variant="contained"
          disabled={!facade.canSubmit || facade.submitting}
          onClick={handleOpen}
        >
          {actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function BookList({ onSelectBook }: BookListProps) {
  const facade = useBooksFacade({ onSelectBook });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar variant={facade.isMobile ? 'dense' : 'regular'} sx={{ gap: 1 }}>
          <MenuBookIcon fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            My Library
          </Typography>
          <Tooltip title="Mở PDF từ URL hoặc file">
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileOpenOutlinedIcon />}
              onClick={facade.openDialog}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              {facade.isMobile ? 'Mở' : 'Mở PDF'}
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
        {facade.loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : facade.error ? (
          <Alert severity="error">{facade.error}</Alert>
        ) : (
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {facade.books.map((book) => (
              <Grid key={book.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <BookCard book={book} onSelect={() => onSelectBook(book)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <OpenPdfDialog facade={facade} />
    </Box>
  );
}
